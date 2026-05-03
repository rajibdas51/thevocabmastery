'use client'
import { useEffect, useState } from 'react'
import { getCategories } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import AddWordForm from '@/components/words/AddWordForm'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import type { Category } from '@/types'

export default function AddWordPage() {
  const { profile } = useAuthStore()
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    if (profile) getCategories(profile.id).then(({ data }) => setCategories(data ?? []))
  }, [profile])

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Add New Word"
        subtitle="Words you add are private to your account unless you're admin"
      />
      <div className="p-8 max-w-2xl">
        <Card className="p-6">
          <AddWordForm categories={categories} />
        </Card>
      </div>
    </div>
  )
}